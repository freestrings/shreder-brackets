Simple Spring RestAPI Documentation Generator
======

This is documentaion generator for spring mvc framework based on [Brackets](https://github.com/adobe/brackets). 

But, this is experimental implementation yet. Shreder will be provided as web service or jenkins plugin later.

Install Easy
------------

File > Extension Manager.

Search for `Shreder` and click in install.

Alternative Install
-------------------

File > Extension Manager

Paste https://github.com/freestrings/shreder-brackets into Extension URL field

How to use
----------

1. View > Launch Shreder or click a shreder icon ![shreder icon](../master/images/shreder-icon.svg?raw=true) on main toolbar
2. Insert Maven Home and [SCM](http://maven.apache.org/scm/scms-overview.html) URL. If you don't have spring project, you can use [this](https://github.com/freestrings/spring-mvc-showcase). ( it is a comment added clone repository of spring-mvc-showcase )
3. Click Generate.

Output
----------

###### Callable, DeferredResult is typed parameter.

```
	@Controller
	@RequestMapping("/async/callable")
	public class CallableController {
		...
		@RequestMapping("/response-body")
		public 
		@ResponseBody Callable<String> callable() {
			...
		}
		...
	}
	
```
- GET, /async/callable/response-body
- Request: - 
- Response: String

###### Standard Arguments are ignored.

- Reader
- OutputStream
- HttpSession
- HttpServletResponse
- HttpServletRequest
- Model
- etc 

```
	@RequestMapping(value = "/data/standard/request", method = RequestMethod.GET)
	public @ResponseBody
	String standardRequestArgs(HttpServletRequest request, Principal user, Locale locale) {
		...
	}
	
	@RequestMapping(value = "/data/standard/request/reader", method = RequestMethod.POST)
	public @ResponseBody
	String requestReader(Reader requestBodyReader) throws IOException {
		...
	}
	
```
- Request: -
- Response: String

###### javax.validation.constraints.* and custom annotations.

```
	@RequestMapping(value="/form", method=RequestMethod.POST)
	public String processSubmit(
		@Valid FormBean formBean, 
		BindingResult result, 
		@ModelAttribute("ajaxRequest") boolean ajaxRequest,
		Model model, RedirectAttributes redirectAttrs) {
		...
	}
	
	class FormBean {
	
		@NotEmpty
		private String name;
	
		@Min(21)
		private int age;

		@DateTimeFormat(iso=ISO.DATE)
		@Past
		private Date birthDate;

		@MaskFormat("(###) ###-####")
		private String phone;

		@NumberFormat(pattern="$###,###.00")
		private BigDecimal currency;

		@NumberFormat(style=Style.PERCENT)
		private BigDecimal percent;

		
		…
		
	}
```
- POST, /form,
- Request: formBean object, ajaxRequest boolean

formBean

- name: string, NotEmpty
- age: integer, Min "value": "21"
- birthDate: datetime, Past, DateTimeFormat "iso": "DATE"
- phone: string, MaskFormat "value": "(###) ###-####"
- currency: number, NumberFormat "pattern": $###,###.00"

###### Enum, Collection, Map

```
	public enum InquiryType {
		comment, feedback, suggestion;
	}
		
	@RequestMapping(value="/enumtest")
	public @ResponseBody List<InquiryType> getInqueryTypes() { … }
```
- GET, /enumtest
- Request: - 
- Resonse: inuquiry[]: enum (comment|feedback|suggestion)


```
	@RequestMapping(value="maptest")
	public @ResponseBody Map<String, Integer> getInqueryTypes() { … }
```
- GET, /maptest
- Request: - 
- Resonse: map $key string, $value integer

###### Nested object

```

	class JavaBean {
	
    	private NestedBean nested;
    	
    	…
    	
	}
	
	public class NestedBean {
	
		private String foo;

		private List<NestedBean> listValue;
	
		private Map<String, NestedBean> mapValue;
		
		…
		
	}
	
	@RequestMapping("/convert/bean")
	public @ResponseBody String bean(JavaBean bean) {
		return "Converted " + bean;
	}
```

- GET, /convert/bean
- Request: bean
- Response: String

bean

```
- nested object
	foo string
	listValue[] #reference "nested" 	
	mapValue map
		$key string
		$value #reference "nested"
```

###### Comment

```
	/**
	 * Type conversion sample.<br><br>
	 * 
	 * e.g.)
	 * <br>Primitive: http://localhost:8080/spring-mvc-showcase/convert/bean?primitive=3<br>
	 * 
	 * ….
	 *
	 */
	@RequestMapping("/convert/bean")
	public @ResponseBody String bean(JavaBean bean) {
		return "Converted " + bean;
	}
	
	/**
 	* Type conversion sample. parameter as object.
 	*/
	public class JavaBean {
	
		/**
	 	* primitive value
	 	*/
		private Integer primitive;
		
		@DateTimeFormat(iso=ISO.DATE)
		private Date date;
	
		/**
	 	* date value. datetimeformat
	 	*/
		public Date getDate() { … }
		
		… 
	}
```

--> comment output
 
```
	Type conversion sample.
	
	e.g.)
	Primitive: http://localhost:8080/spring-mvc-showcase/convert/bean?primitive=3
	
	…
	
	Request
		
		Type conversion sample. parameter as object.
		
		* bean: object
		
			primitive value
			
			* primitive: integer
			
			date value. datetimeformat
			
			* date: datetime
			
		
```


Support
-------

If you have any problem or suggestion please open an issue. [here](https://github.com/freestrings/shreder-brackets/issues) 


 
